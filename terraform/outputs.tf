output "s3_bucket_name" {
  description = "Nombre del bucket S3 para almacenamiento de mallas STL"
  value       = aws_s3_bucket.stl_artifacts.bucket
}

output "s3_bucket_arn" {
  description = "ARN del bucket S3"
  value       = aws_s3_bucket.stl_artifacts.arn
}

output "sqs_tier2_queue_url" {
  description = "URL de la cola SQS FIFO para escalamientos Tier 2"
  value       = aws_sqs_queue.tier2_escalations.url
}

output "sqs_tier2_queue_arn" {
  description = "ARN de la cola SQS FIFO"
  value       = aws_sqs_queue.tier2_escalations.arn
}

output "sqs_tier2_dlq_url" {
  description = "URL de la cola DLQ para mensajes fallidos"
  value       = aws_sqs_queue.tier2_dlq.url
}

output "cloudwatch_alarm_name" {
  description = "Nombre de la alarma operativa de SLA"
  value       = aws_cloudwatch_metric_alarm.sla_breach_risk.alarm_name
}
