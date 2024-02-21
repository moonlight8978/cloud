import { Construct } from "constructs";
import { TerraformOutput, TerraformStack } from "cdktf";
import { IamGroup } from "@cdktf/provider-aws/lib/iam-group";
import { DataAwsIamPolicy } from "@cdktf/provider-aws/lib/data-aws-iam-policy";
import { IamGroupPolicyAttachment } from "@cdktf/provider-aws/lib/iam-group-policy-attachment";
import { IamUser } from "@cdktf/provider-aws/lib/iam-user";
import { IamUserLoginProfile } from "@cdktf/provider-aws/lib/iam-user-login-profile";
import { IamUserGroupMembership } from "@cdktf/provider-aws/lib/iam-user-group-membership";
import { Aws } from "../resources/aws";

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
