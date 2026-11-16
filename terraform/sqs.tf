# Cola de Letras Muertas (DLQ) para escalamientos que fallen tras 3 intentos
resource "aws_sqs_queue" "tier2_dlq" {
  name                        = "printops-tier2-dlq-${var.environment}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600 # 14 días

  tags = {
    Project     = "PrintOps-BPO"
    Environment = var.environment
  }
}

# Cola Principal FIFO para desacople de tickets escalados a Tier 2
resource "aws_sqs_queue" "tier2_escalations" {
  name                        = "printops-tier2-escalations-${var.environment}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 300   # 5 minutos para que el especialista procese
  message_retention_seconds   = 86400 # 24 horas

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.tier2_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Project     = "PrintOps-BPO"
    Environment = var.environment
  }
}
