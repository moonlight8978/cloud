import {
  DataTerraformRemoteState,
  Fn,
  IResolvable,
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
import {
  MoonLightTerraformBackend,
  MoonLightTerraformData,
} from "@resources/backend";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { DefaultRouteTable } from "@cdktf/provider-aws/lib/default-route-table";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { DataAwsVpc } from "@cdktf/provider-aws/lib/data-aws-vpc";
import { DataAwsSubnet } from "@cdktf/provider-aws/lib/data-aws-subnet";

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

    const azs = new TerraformLocal(
      this,
      "azs",
      Fn.flatten(
        subnetsVarEach.forExpressionForList(
          `[for i, az in ${vars.availabilityZones.fqn}:
            {
              subnetKey = key,
              az = az,
              cidr = cidrsubnet(
                ${indexToSubnetCidr.fqn}[key],
                ceil(log(length(${vars.availabilityZones.fqn}), 2)),
                i
              )
            }
          ]`
        )
      )
    );

    const subnetCidrsEach = TerraformIterator.fromComplexList(
      azs.expression,
      "cidr"
    );
    const subnets = new Subnet(this, "subnet", {
      forEach: subnetCidrsEach,
      vpcId: vpc.id,
      mapPublicIpOnLaunch: true,
      cidrBlock: subnetCidrsEach.getString("cidr"),
      availabilityZone: subnetCidrsEach.getString("az"),
    });

    const azsEach = TerraformIterator.fromList(azs.expression);
    const subnetToAzs = new TerraformLocal(
      this,
      "subnet-to-azs",
      azsEach.forExpressionForMap(
        `${vars.subnets.fqn}[val.subnetKey].name`,
        "val..."
      )
    );
    new TerraformOutput(this, "subnet-to-az-to-id-out", {
      value: TerraformIterator.fromMap(
        subnetToAzs.expression
      ).forExpressionForMap(
        "key",
        `{ for az in val: az.az => ${subnets.fqn}[az.cidr].id }`
      ),
    });
  }
}

export class AlphaNetworkData extends MoonLightTerraformData {
  constructor(scope: Construct) {
    super(scope, "alpha-network");
  }

  public get subnetToAzToId() {
    return this.get("subnet-to-az-to-id-out");
  }

  public getSubnet(id: string, subnet: any, az: any) {
    return new DataAwsSubnet(this, id, {
      id: Fn.lookupNested(this.getString("subnet-to-az-to-id-out"), [
        subnet?.fqn ?? subnet,
        az?.fqn ?? az,
      ]),
    });
  }

  public get vpc() {
    return new DataAwsVpc(this, "vpc", {
      id: this.getString("vpc-id-out"),
    });
  }
}
