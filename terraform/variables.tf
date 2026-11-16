variable "aws_region" {
  description = "Región de AWS para despliegue"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Ambiente de despliegue (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "use_localstack" {
  description = "Determina si se usa LocalStack para emulación $0 en local y CI"
  type        = bool
  default     = true
}

variable "localstack_endpoint" {
  description = "Endpoint HTTP de LocalStack"
  type        = string
  default     = "http://localhost:4566"
}
