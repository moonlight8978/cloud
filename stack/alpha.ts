import {
  TerraformIterator,
  TerraformOutput,
  TerraformStack,
  TerraformVariable,
} from "cdktf";
import { Construct } from "constructs";
import { Aws } from "../resources/aws";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";
import { KeyPair } from "@cdktf/provider-aws/lib/key-pair";
import { Ec2InstanceState } from "@cdktf/provider-aws/lib/ec2-instance-state";
import { VpcSecurityGroupIngressRule } from "@cdktf/provider-aws/lib/vpc-security-group-ingress-rule";
import { VpcSecurityGroupEgressRule } from "@cdktf/provider-aws/lib/vpc-security-group-egress-rule";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";

export class AlphaStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new Aws(this, "aws");

    const ubuntuAmi = new TerraformVariable(this, "ubuntu-2204-ami", {
      nullable: false,
    });

    new DataAwsAmi(this, "data-ami-ubuntu", {
      filter: [
        {
          name: "name",
          values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"],
        },
        { name: "virtualization-type", values: ["hvm"] },
      ],
      owners: ["099720109477"],
      mostRecent: true,
    }).id;

    const instanceDefs = TerraformIterator.fromMap({
      0: {
        instanceType: "t2.micro",
      },
    });

    const sshkey = new KeyPair(this, "node-keypair", {
      publicKey:
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBV+J3TZuGuF1smz9/MWhXSP5hiRaY8fQsBFiENa7xxw alpha-node",
    });

    const nodeInitScript = `
      #! /bin/bash
      apt-get update
      apt-get install -y nginx
      systemctl start nginx
      systemctl enable nginx
      echo "Hello, World!" | tee /var/www/html/index.html
    `.trim();

    const tcpPorts = TerraformIterator.fromMap({
      http: {
        port: 80,
      },
      https: {
        port: 443,
      },
      ssh: { port: 22 },
    });

    const nodeSg = new SecurityGroup(this, "node-sg", {});

    new VpcSecurityGroupIngressRule(this, "node-ingress", {
      forEach: tcpPorts,
      ipProtocol: "tcp",
      fromPort: tcpPorts.getNumber("port"),
      toPort: tcpPorts.getNumber("port"),
      cidrIpv4: "0.0.0.0/0",
      securityGroupId: nodeSg.id,
    });

    new VpcSecurityGroupEgressRule(this, "node-egress", {
      ipProtocol: "-1",
      securityGroupId: nodeSg.id,
      cidrIpv4: "0.0.0.0/0",
    });

    const instance = new Instance(this, "node", {
      forEach: instanceDefs,
      ami: ubuntuAmi.value,
      instanceType: instanceDefs.getString("instanceType"),
      keyName: sshkey.keyName,
      ebsBlockDevice: [
        {
          deviceName: "/dev/sda1",
          volumeSize: 8,
          volumeType: "gp2",
          deleteOnTermination: true,
        },
      ],
      userData: nodeInitScript,
      vpcSecurityGroupIds: [nodeSg.id],
    });

    const instances = TerraformIterator.fromResources(instance);

    new Ec2InstanceState(this, "node-state", {
      forEach: instances,
      state: "running",
      instanceId: instances.getString("id"),
    });

    new TerraformOutput(this, "ami-output", {
      value: ubuntuAmi,
    });

    new TerraformOutput(this, "node-public-ip", {
      value: instances.forExpressionForMap("key", "val.public_ip"),
    });
  }
}
