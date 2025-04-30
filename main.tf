terraform {
  required_providers {
    # https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.0.2"
    }
  }
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

# Creating cdk-klient Docker Image with the `latest` as the Tag.
resource "docker_image" "cdk_klient" {
  name = var.docker_image
}

# Create Docker Container using the cdk-klient image.
resource "docker_container" "cdk_klient" {
  count             = 1
  image             = docker_image.cdk_klient.image_id
  name              = var.docker_container_name
  must_run          = true
  publish_all_ports = true
  # restart           = "always" # default "no"

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
