# ozlem.dev-cdk

CDK app that deploys the infrastructure needed to serve my static blog.

## Components

**S3 Bucket**: This acts as the origin and serves my static blog content.
**CloudFront Distribution**: The CF distribution caches my content on the edge and forwards requests to my origin bucket when necessary.


## Deploy

When you made changes to the CDK app you can deploy those changes via invoking the below command.
```bash
$ cdk deploy --all --profile <aws profile name>
```
