# aws-access-key = ""
# aws-secret-key = ""
aws-region      = "ap-southeast-1"
ubuntu-2204-ami = "ami-04f960535b09d4d11"
alpha-az        = "ap-southeast-1a"

alpha-cidr = "10.0.0.0/16"
alpha-subnets = [
  {
    name = "priv-general"
    bits = 1
  },
  {
    name = "pub"
    bits = 2
  },
  {
    name = "priv-dedicated"
    bits = 3
  },
  {
    name = "reserve"
    bits = 3
  },
]
