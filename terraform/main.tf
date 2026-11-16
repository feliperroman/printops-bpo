terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  access_key                  = var.use_localstack ? "mock_key" : null
  secret_key                  = var.use_localstack ? "mock_secret" : null
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    s3         = var.use_localstack ? var.localstack_endpoint : null
    sqs        = var.use_localstack ? var.localstack_endpoint : null
    cloudwatch = var.use_localstack ? var.localstack_endpoint : null
  }
}
