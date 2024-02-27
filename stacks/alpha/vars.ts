import {
  TerraformVariable,
  TerraformVariableConfig,
  VariableType,
} from "cdktf";
import { Construct } from "constructs";

export class AlphaVars extends Construct {
  public cidr = this.createVar("cidr", {
    nullable: false,
  });

  public subnets = this.createVar("subnets", {
    nullable: false,
    type: "list(object({bits = number, name = string}))",
  });

  public availabilityZones = this.createVar("availability-zones", {
    nullable: false,
    type: "list(string)",
  });

  public landingPageAz = this.createVar("landing-page-az", {
    nullable: false,
    type: "string",
  });

  public landingPageUbuntuAmi = this.createVar("landing-page-ubuntu-ami", {
    nullable: false,
    type: "string",
  });

  public landingPageNodes = this.createVar("landing-page-nodes", {
    nullable: false,
    type: "map(object({ instanceType = string }))",
  });

  constructor(private scope: Construct) {
    super(scope, "alpha");
  }

  private createVar(name: string, config: TerraformVariableConfig) {
    return new TerraformVariable(this.scope, `alpha-${name}`, config);
  }
}
