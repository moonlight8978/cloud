import {
  TerraformIterator,
  TerraformLocal,
  TerraformOutput,
  TerraformStack,
  Token,
} from "cdktf";
import { Construct } from "constructs";
import { Aws } from "@resources/aws";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { AlphaVars } from "./vars";
import { MoonLightTerraformBackend } from "@resources/backend";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { DefaultRouteTable } from "@cdktf/provider-aws/lib/default-route-table";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";

export class AlphaNetworkStack extends TerraformStack {
  constructor(scope: Construct) {
    super(scope, "alpha-network");

    new MoonLightTerraformBackend(this, "alpha-network");

    const vars = new AlphaVars(this);

    new Aws(this, "aws");

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: vars.cidr.stringValue,
      enableDnsHostnames: true,
    });

    new TerraformOutput(this, "vpc-id-out", {
      value: vpc.id,
    });

    const igw = new InternetGateway(this, "igw", {
      vpcId: vpc.id,
    });

    new DefaultRouteTable(this, "default-rt", {
      defaultRouteTableId: vpc.defaultRouteTableId,
      route: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: igw.id,
        },
      ],
    });

    const subnetsVarEach = TerraformIterator.fromMap(vars.subnets.value);
    const subnetBits = new TerraformLocal(
      this,
      "subnet-bits",
      subnetsVarEach.pluckProperty("bits")
    );
    const subnetCidrs = new TerraformLocal(
      this,
      "subnet-cidrs",
      `\${cidrsubnets(${vars.cidr.fqn}, flatten(${subnetBits.fqn})...)}`
    );
    const indexToSubnetCidr = new TerraformLocal(
      this,
      "index-to-subnet-cidr",
      subnetsVarEach.forExpressionForMap(
        "key",
        `element(${subnetCidrs.fqn}, key)`
      )
    );

    new TerraformOutput(this, "subnet-cidr-out", {
      value: subnetsVarEach.forExpressionForMap(
        `val.name`,
        `${indexToSubnetCidr.fqn}[key]`
      ),
    });

    const subnetCidrsEach = TerraformIterator.fromList(subnetCidrs.expression);
    new Subnet(this, "subnet", {
      forEach: subnetCidrsEach,
      vpcId: vpc.id,
      mapPublicIpOnLaunch: true,
      cidrBlock: subnetCidrsEach.value,
    });
  }
}
