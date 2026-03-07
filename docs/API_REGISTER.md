# Especificação da API de Registro (OpenAPI 3.0)

```yaml
openapi: 3.0.0
info:
  title: GlobalSecureSend API
  version: 1.0.0
  description: API para registro de usuários com validação multi-etapa e compliance.

paths:
  /api/auth/register:
    post:
      summary: Registrar novo usuário
      description: Cria uma nova conta de usuário, carteira associada e envia email de verificação.
      tags:
        - Auth
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - fullName
                - phone
                - country
                - documentId
                - birthDate
                - gender
                - gdprConsent
                - cookieConsent
              properties:
                email:
                  type: string
                  format: email
                  example: user@example.com
                password:
                  type: string
                  minLength: 8
                  format: password
                  description: Deve conter maiúscula, minúscula, número e caractere especial.
                  example: SecurePass123!
                fullName:
                  type: string
                  minLength: 3
                  example: João Silva
                phone:
                  type: string
                  minLength: 10
                  example: +5511999999999
                country:
                  type: string
                  minLength: 2
                  maxLength: 2
                  example: BR
                documentId:
                  type: string
                  minLength: 5
                  description: CPF (BR), SSN/Passport (US), ou ID Nacional (Outros). Validação específica por país.
                  example: 12345678909
                birthDate:
                  type: string
                  format: date
                  description: Deve ser maior de 18 anos.
                  example: 1990-01-01
                gender:
                  type: string
                  enum: [M, F, O, NB]
                  example: M
                gdprConsent:
                  type: boolean
                  example: true
                cookieConsent:
                  type: boolean
                  example: true
                marketingConsent:
                  type: boolean
                  default: false
                  example: false
      responses:
        200:
          description: Usuário criado com sucesso
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  email:
                    type: string
                  wallet:
                    type: object
        400:
          description: Erro de validação ou dados duplicados
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                  details:
                    type: object
```