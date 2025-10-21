terraform {
  required_providers {
    # https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.6.2"
    }
  }
  required_version = "~> 1.11"
}

variable "APP_DEV_MODE" {
  type = string
}

variable "APP_ENV_CODE" {
  type = string
}

variable "APP_ENV_NAME" {
  type = string
}

variable "APP_KRAMERIUS_ID" {
  type = string
}

variable "docker_host_uri" {
  type = string
}

variable "docker_image" {
  type = string
}

variable "deploy_domain" {
  type = string
}

variable "docker_container_name" {
  type = string
}

variable "ghcr_username" {
  type = string
}

variable "ghcr_token" {
  type = string
}

provider "docker" {
  host     = var.docker_host_uri
  ssh_opts = ["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"]
  registry_auth {
    address  = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
  }
}

# Creating cdk_klient Docker Image
# with the `latest` as Tag
resource "docker_image" "cdk_klient" {
  name = var.docker_image
}

# Create Docker Container using the cdk_klient image.
resource "docker_container" "cdk_klient" {
  count             = 1
  memory            = 256
  image             = docker_image.cdk_klient.image_id
  name              = var.docker_container_name
  must_run          = true
  publish_all_ports = true
  restart           = "always" # default "no"
  env = [
    "APP_DEV_MODE=${var.APP_DEV_MODE}",
    "APP_ENV_NAME=${var.APP_ENV_NAME}",
    "APP_ENV_CODE=${var.APP_ENV_CODE}",
    "APP_KRAMERIUS_ID=${var.APP_KRAMERIUS_ID}"
  ]

  labels {
    label = "traefik.http.routers.${var.docker_container_name}.rule"
    value = "Host(`${var.deploy_domain}`)"
  }
  labels {
    label = "traefik.http.routers.${var.docker_container_name}.tls"
    value = true
  }
  labels {
    label = "traefik.http.routers.${var.docker_container_name}.tls.certresolver"
    value = "myresolver"
  }
}
