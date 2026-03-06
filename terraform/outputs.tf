output "app_url" {
  description = "URL of the deployed Control Tower application"
  value       = "https://${azurerm_container_app.main.ingress[0].fqdn}"
}

output "container_registry_url" {
  description = "Azure Container Registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}
