import {
  Fn,
  TerraformIterator,
  TerraformOutput,
  TerraformStack,
  TerraformVariable,
  Token,
} from "cdktf";
import { Construct } from "constructs";
import { Aws } from "../resources/aws";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { EbsVolume } from "@cdktf/provider-aws/lib/ebs-volume";
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";
import { KeyPair } from "@cdktf/provider-aws/lib/key-pair";
import { Ec2InstanceState } from "@cdktf/provider-aws/lib/ec2-instance-state";
import { VpcSecurityGroupIngressRule } from "@cdktf/provider-aws/lib/vpc-security-group-ingress-rule";
import { VpcSecurityGroupEgressRule } from "@cdktf/provider-aws/lib/vpc-security-group-egress-rule";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { IamInstanceProfile } from "@cdktf/provider-aws/lib/iam-instance-profile";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { VolumeAttachment } from "@cdktf/provider-aws/lib/volume-attachment";

export class AlphaStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new Aws(this, "aws");

    const ubuntuAmi = new TerraformVariable(this, "ubuntu-2204-ami", {
      nullable: false,
    });

    const az = new TerraformVariable(this, "alpha-az", {
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
      // 0: {
      //   instanceType: "t2.micro",
      // },
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

      apt-get install -y unzip zip
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip awscliv2.zip
      ./aws/install
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

    const ec2RolePolicyData = new DataAwsIamPolicyDocument(
      this,
      "ec2-role-policy-data",
      {
        statement: [
          {
            actions: ["sts:AssumeRole"],
            effect: "Allow",
            principals: [
              {
                type: "Service",
                identifiers: ["ec2.amazonaws.com"],
              },
            ],
          },
        ],
      }
    );

    const nodeRole = new IamRole(this, "node-role", {
      assumeRolePolicy: ec2RolePolicyData.json,
    });

    const nodePolicyDocument = new DataAwsIamPolicyDocument(
      this,
      "node-policy-data",
      {
        statement: [
          {
            effect: "Allow",
            actions: ["ec2:Describe*"],
            resources: ["*"],
          },
        ],
      }
    );

    const nodePolicy = new IamPolicy(this, "node-policy", {
      policy: nodePolicyDocument.json,
    });

    new IamRolePolicyAttachment(this, "node-role-policy", {
      role: nodeRole.name,
      policyArn: nodePolicy.arn,
    });

    const nodeProfile = new IamInstanceProfile(this, "node-profile", {
      role: nodeRole.name,
    });

    const cacheEbs = new EbsVolume(this, "cache-ebs", {
      forEach: instanceDefs,
      size: 1,
      type: "gp2",
      availabilityZone: az.value,
    });

    const cacheEbses = TerraformIterator.fromResources(cacheEbs);

    new TerraformOutput(this, "cache-ebs-id-output", {
      value: cacheEbses.pluckProperty("id"),
    });

    const instance = new Instance(this, "node", {
      forEach: instanceDefs,
      ami: ubuntuAmi.value,
      instanceType: instanceDefs.getString("instanceType"),
      availabilityZone: az.value,
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
      iamInstanceProfile: nodeProfile.name,
    });

    const instances = TerraformIterator.fromResources(instance);

    new VolumeAttachment(this, "node-cache-ebs-attachment", {
      forEach: instances,
      instanceId: instances.getString("id"),
      volumeId: Fn.element(
        Token.asList(cacheEbses.pluckProperty("id")),
        instances.key
      ),
      deviceName: "/dev/sdf",
    });

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
