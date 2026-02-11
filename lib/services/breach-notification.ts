import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendEmail, templates } from './email';

export interface SecurityIncident {
  id: string;
  type: 'DATA_BREACH' | 'UNAUTHORIZED_ACCESS' | 'SYSTEM_COMPROMISE' | 'THIRD_PARTY_BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedSystems: string[];
  discoveredAt: Date;
  occurredAt: Date;
  affectedUserIds?: string[];
  affectedDataTypes: string[];
  rootCause?: string;
  immediateActions?: string[];
}

export interface BreachAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedUsers: number;
  notificationSent: boolean;
  authorityNotified: boolean;
  userNotificationRequired: boolean;
  assessmentReason: string;
}

export class BreachNotificationService {
  private readonly SUPERVISORY_AUTHORITY_EMAIL = process.env.SUPERVISORY_AUTHORITY_EMAIL || 'dpo@globalsecuresend.com';
  private readonly NOTIFICATION_DEADLINE_HOURS = 72; // GDPR Art. 33 - 72 horas

  /**
   * Detecta e avalia uma violação de segurança
   */
  async detectBreach(incident: SecurityIncident): Promise<BreachAssessment> {
    try {
      logger.critical('Security incident detected', {
        incidentId: incident.id,
        type: incident.type,
        severity: incident.severity,
        affectedSystems: incident.affectedSystems
      });

      // Identificar usuários afetados
      const affectedUsers = await this.identifyAffectedUsers(incident);
      
      // Avaliar nível de risco
      const riskLevel = await this.assessRiskLevel(incident, affectedUsers);
      
      // Decidir se notificação é necessária
      const notificationRequired = this.isNotificationRequired(riskLevel, incident);
      
      let authorityNotified = false;
      let userNotificationSent = false;

      if (notificationRequired) {
        // Notificar autoridade de supervisão (obrigatório em 72h para HIGH/CRITICAL)
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
          authorityNotified = await this.notifySupervisoryAuthority(incident, affectedUsers);
        }

        // Notificar usuários afetados (obrigatório sem demora injustificada)
        if (affectedUsers.length > 0) {
          userNotificationSent = await this.notifyAffectedUsers(affectedUsers, incident);
        }
      }

      // Registrar incidente no banco de dados
      await this.recordIncident(incident, affectedUsers, riskLevel, {
        authorityNotified,
        userNotificationSent,
        notificationRequired
      });

      return {
        riskLevel,
        affectedUsers: affectedUsers.length,
        notificationSent: authorityNotified || userNotificationSent,
        authorityNotified,
        userNotificationRequired: affectedUsers.length > 0,
        assessmentReason: this.getAssessmentReason(riskLevel, incident)
      };

    } catch (error) {
      logger.error('Error in breach detection', { error, incidentId: incident.id });
      throw error;
    }
  }

  /**
   * Identifica usuários potencialmente afetados pelo incidente
   */
  private async identifyAffectedUsers(incident: SecurityIncident): Promise<string[]> {
    if (incident.affectedUserIds && incident.affectedUserIds.length > 0) {
      return incident.affectedUserIds;
    }

    // Buscar usuários baseado nos sistemas afetados
    const affectedUsers = new Set<string>();

    for (const system of incident.affectedSystems) {
      switch (system) {
        case 'USER_DATABASE':
          const users = await prisma.user.findMany({
            select: { id: true }
          });
          users.forEach(user => affectedUsers.add(user.id));
          break;

        case 'TRANSACTION_SYSTEM':
          const transactions = await prisma.transfer.findMany({
            select: { senderId: true, receiverId: true }
          });
          transactions.forEach(tx => {
            if (tx.senderId) affectedUsers.add(tx.senderId);
            if (tx.receiverId) affectedUsers.add(tx.receiverId);
          });
          break;

        case 'CARD_SYSTEM':
          const cards = await prisma.virtualCard.findMany({
            select: { userId: true }
          });
          cards.forEach(card => affectedUsers.add(card.userId));
          break;

        case 'KYC_SYSTEM':
          const kycDocs = await prisma.kYCDocument.findMany({
            select: { userId: true }
          });
          kycDocs.forEach(doc => affectedUsers.add(doc.userId));
          break;
      }
    }

    return Array.from(affectedUsers);
  }

  /**
   * Avalia o nível de risco do incidente
   */
  private async assessRiskLevel(incident: SecurityIncident, affectedUsers: string[]): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    let riskScore = 0;

    // Tipo de incidente
    switch (incident.type) {
      case 'DATA_BREACH': riskScore += 4; break;
      case 'UNAUTHORIZED_ACCESS': riskScore += 3; break;
      case 'SYSTEM_COMPROMISE': riskScore += 5; break;
      case 'THIRD_PARTY_BREACH': riskScore += 2; break;
    }

    // Severidade inicial
    switch (incident.severity) {
      case 'CRITICAL': riskScore += 5; break;
      case 'HIGH': riskScore += 3; break;
      case 'MEDIUM': riskScore += 2; break;
      case 'LOW': riskScore += 1; break;
    }

    // Número de usuários afetados
    if (affectedUsers.length > 1000) riskScore += 3;
    else if (affectedUsers.length > 100) riskScore += 2;
    else if (affectedUsers.length > 10) riskScore += 1;

    // Tipos de dados afetados
    if (incident.affectedDataTypes.includes('PERSONAL_DATA')) riskScore += 2;
    if (incident.affectedDataTypes.includes('FINANCIAL_DATA')) riskScore += 3;
    if (incident.affectedDataTypes.includes('IDENTITY_DOCUMENTS')) riskScore += 4;
    if (incident.affectedDataTypes.includes('PAYMENT_DATA')) riskScore += 5;

    // Determinar nível de risco
    if (riskScore >= 10) return 'CRITICAL';
    if (riskScore >= 7) return 'HIGH';
    if (riskScore >= 4) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Determina se notificação é necessária
   */
  private isNotificationRequired(riskLevel: string, incident: SecurityIncident): boolean {
    // GDPR: Notificação obrigatória para HIGH/CRITICAL
    return riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
  }

  /**
   * Notifica autoridade de supervisão (DPO)
   */
  private async notifySupervisoryAuthority(incident: SecurityIncident, affectedUsers: string[]): Promise<boolean> {
    try {
      const notificationEmail = {
        to: this.SUPERVISORY_AUTHORITY_EMAIL,
        subject: `[URGENTE] Notificação de Violação de Dados - ${incident.id}`,
        html: `
          <h2>Notificação de Violação de Dados - GDPR Art. 33</h2>
          <p><strong>ID do Incidente:</strong> ${incident.id}</p>
          <p><strong>Tipo:</strong> ${incident.type}</p>
          <p><strong>Severidade:</strong> ${incident.severity}</p>
          <p><strong>Nível de Risco:</strong> ${await this.assessRiskLevel(incident, affectedUsers)}</p>
          <p><strong>Data de Descoberta:</strong> ${incident.discoveredAt.toISOString()}</p>
          <p><strong>Data Provável da Ocorrência:</strong> ${incident.occurredAt.toISOString()}</p>
          <p><strong>Usuários Afetados:</strong> ${affectedUsers.length}</p>
          <p><strong>Sistemas Afetados:</strong> ${incident.affectedSystems.join(', ')}</p>
          <p><strong>Tipos de Dados:</strong> ${incident.affectedDataTypes.join(', ')}</p>
          <p><strong>Descrição:</strong> ${incident.description}</p>
          ${incident.rootCause ? `<p><strong>Causa Raiz:</strong> ${incident.rootCause}</p>` : ''}
          ${incident.immediateActions ? `<p><strong>Ações Imediatas:</strong> ${incident.immediateActions.join(', ')}</p>` : ''}
          <p><strong>Prazo para Notificação:</strong> 72 horas (GDPR Art. 33)</p>
          <p><strong>Horário Atual:</strong> ${new Date().toISOString()}</p>
        `
      };

      await sendEmail(notificationEmail);
      logger.critical('Supervisory authority notified of data breach', {
        incidentId: incident.id,
        affectedUsers: affectedUsers.length,
        notificationTime: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Failed to notify supervisory authority', { error, incidentId: incident.id });
      return false;
    }
  }

  /**
   * Notifica usuários afetados
   */
  private async notifyAffectedUsers(affectedUserIds: string[], incident: SecurityIncident): Promise<boolean> {
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: affectedUserIds } },
        select: { email: true, firstName: true }
      });

      let notificationsSent = 0;

      for (const user of users) {
        try {
          const userNotification = {
            to: user.email,
            subject: 'Notificação Importante - Segurança da sua Conta GlobalSecureSend',
            html: `
              <h2>Prezado(a) ${user.firstName || 'Cliente'},</h2>
              <p>Identificamos um incidente de segurança que pode ter afetado seus dados pessoais.</p>
              <p><strong>O que aconteceu:</strong></p>
              <p>${incident.description}</p>
              <p><strong>Quando ocorreu:</strong> ${incident.occurredAt.toLocaleDateString('pt-BR')}</p>
              <p><strong>Dados que podem ter sido afetados:</strong> ${incident.affectedDataTypes.join(', ')}</p>
              <p><strong>O que estamos fazendo:</strong></p>
              <ul>
                <li>Investigamos o incidente com nossa equipe de segurança</li>
                <li>Implementamos medidas adicionais de proteção</li>
                <li>Notificamos as autoridades competentes</li>
              </ul>
              <p><strong>O que você deve fazer:</strong></p>
              <ul>
                <li>Altere sua senha imediatamente</li>
                <li>Monitorize suas contas por atividades suspeitas</li>
                <li>Entre em contato conosco se notar algo incomum</li>
              </ul>
              <p>Para mais informações, acesse sua conta ou entre em contato com nosso suporte.</p>
              <p>Atenciosamente,<br>Equipe GlobalSecureSend</p>
            `
          };

          await sendEmail(userNotification);
          notificationsSent++;
        } catch (userError) {
          logger.error('Failed to notify user', { 
            error: userError, 
            userId: user.email, 
            incidentId: incident.id 
          });
        }
      }

      logger.critical('Users notified of data breach', {
        incidentId: incident.id,
        totalUsers: users.length,
        notificationsSent,
        notificationTime: new Date().toISOString()
      });

      return notificationsSent > 0;
    } catch (error) {
      logger.error('Failed to notify affected users', { error, incidentId: incident.id });
      return false;
    }
  }

  /**
   * Registra o incidente no banco de dados
   */
  private async recordIncident(
    incident: SecurityIncident, 
    affectedUsers: string[], 
    riskLevel: string,
    notificationStatus: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SECURITY_INCIDENT',
          resource: 'SYSTEM',
          metadata: {
            incidentId: incident.id,
            type: incident.type,
            severity: incident.severity,
            riskLevel,
            affectedUsers: affectedUsers.length,
            affectedSystems: incident.affectedSystems,
            affectedDataTypes: incident.affectedDataTypes,
            notificationStatus,
            rootCause: incident.rootCause,
            immediateActions: incident.immediateActions
          }
        }
      });
    } catch (error) {
      logger.error('Failed to record incident', { error, incidentId: incident.id });
    }
  }

  /**
   * Retorna razão da avaliação de risco
   */
  private getAssessmentReason(riskLevel: string, incident: SecurityIncident): string {
    const reasons = [];
    
    if (incident.affectedDataTypes.includes('PAYMENT_DATA')) {
      reasons.push('dados de pagamento envolvidos');
    }
    if (incident.affectedDataTypes.includes('IDENTITY_DOCUMENTS')) {
      reasons.push('documentos de identidade comprometidos');
    }
    if (incident.severity === 'CRITICAL') {
      reasons.push('severidade crítica do incidente');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'avaliação de risco padrão';
  }
}

// Exportar instância singleton
export const breachNotificationService = new BreachNotificationService();