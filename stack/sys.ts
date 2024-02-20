import { Construct } from "constructs";
import { TerraformOutput, TerraformStack, TerraformVariable } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { IamGroup } from "@cdktf/provider-aws/lib/iam-group";
import { DataAwsIamPolicy } from "@cdktf/provider-aws/lib/data-aws-iam-policy";
import { IamGroupPolicyAttachment } from "@cdktf/provider-aws/lib/iam-group-policy-attachment";
import { IamUser } from "@cdktf/provider-aws/lib/iam-user";
import { IamUserLoginProfile } from "@cdktf/provider-aws/lib/iam-user-login-profile";
import { IamUserGroupMembership } from "@cdktf/provider-aws/lib/iam-user-group-membership";

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

export class SystemStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new Aws(this, "aws");

    const adminGroup = new IamGroup(this, "admin", {
      name: "admin",
    });

    const adminPolicy = new DataAwsIamPolicy(this, "adminPolicy", {
      arn: "arn:aws:iam::aws:policy/AdministratorAccess",
    });

    new IamGroupPolicyAttachment(this, "adminPolicyAttachment", {
      group: adminGroup.name,
      policyArn: adminPolicy.arn,
    });

    const bichls = new IamUser(this, "bichls", {
      name: "bichls",
    });

    new IamUserGroupMembership(this, "bichlsAdminGroups", {
      user: bichls.name,
      groups: [adminGroup.name],
    });

    const bichlsLogin = new IamUserLoginProfile(this, "bichlsLoginProfile", {
      user: bichls.name,
      passwordResetRequired: true,
    });

    new TerraformOutput(this, "bichlsInitialPassword", {
      value: bichlsLogin.password,
      sensitive: true,
    });
  }
}
