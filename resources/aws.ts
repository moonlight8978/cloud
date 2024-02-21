import { Construct } from "constructs";
import { TerraformVariable } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

export class Aws extends Construct {
  constructor(scope: Construct, id: string, region?: string) {
    super(scope, id);

    region ??= new TerraformVariable(scope, "aws-region", {
      nullable: false,
    }).value;

    const accessKey = new TerraformVariable(scope, "aws-access-key", {
      sensitive: true,
    });

    const secretKey = new TerraformVariable(scope, "aws-secret-key", {
      sensitive: true,
    });

    new AwsProvider(this, `${id}-provider`, {
      region,
      accessKey: accessKey.value,
      secretKey: secretKey.value,
    });
  }
}
