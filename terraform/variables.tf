variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "control-tower"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "westeurope"
}

variable "azure_ad_tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "azure_ad_client_id" {
  description = "Azure AD app registration client ID"
  type        = string
  sensitive   = true
}

variable "azure_ad_client_secret" {
  description = "Azure AD app registration client secret"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth.js secret for JWT encryption"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    project     = "control-tower"
    environment = "production"
    managedBy   = "terraform"
  }
}
