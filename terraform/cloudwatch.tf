# Alarma CloudWatch para riesgo de incumplimiento de SLA (SLA_BREACH_RISK)
# Se dispara si un ticket P1 permanece más de 30 minutos sin asignar o si hay más de 10 mensajes en cola
resource "aws_cloudwatch_metric_alarm" "sla_breach_risk" {
  alarm_name          = "printops-${var.environment}-SLA_BREACH_RISK"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300 # 5 minutos
  statistic           = "Maximum"
  threshold           = 10
  alarm_description   = "Alarma operativa BPO: acumulacion excesiva en cola Tier 2 que arriesga SLAs"

  dimensions = {
    QueueName = aws_sqs_queue.tier2_escalations.name
  }

  tags = {
    Project     = "PrintOps-BPO"
    Environment = var.environment
  }
}
