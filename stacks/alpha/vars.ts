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

  constructor(private scope: Construct) {
    super(scope, "alpha");
  }

  private createVar(name: string, config: TerraformVariableConfig) {
    return new TerraformVariable(this.scope, `alpha-${name}`, config);
  }
}
