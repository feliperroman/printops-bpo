resource "aws_s3_bucket" "stl_artifacts" {
  bucket = "printops-stl-artifacts-${var.environment}"

  tags = {
    Project     = "PrintOps-BPO"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "stl_encryption" {
  bucket = aws_s3_bucket.stl_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "stl_lifecycle" {
  bucket = aws_s3_bucket.stl_artifacts.id

  rule {
    id     = "expire-temp-stl-cache"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}
