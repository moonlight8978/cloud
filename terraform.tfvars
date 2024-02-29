# aws-access-key = ""
# aws-secret-key = ""
aws-region = "ap-southeast-1"

alpha-landing-page-ubuntu-ami = "ami-04f960535b09d4d11"
alpha-landing-page-az         = "ap-southeast-1a"
alpha-landing-page-nodes = {
  # 0 : {
  #   instanceType = "t2.micro"
  # }
}
# alpha-landing-page-node-ssh-pub  = ""
# alpha-landing-page-node-ssh-priv = ""

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
alpha-availability-zones = [
  "ap-southeast-1a",
  "ap-southeast-1b",
  "ap-southeast-1c",
]
