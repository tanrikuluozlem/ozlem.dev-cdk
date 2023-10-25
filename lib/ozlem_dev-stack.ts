import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as path from 'path'

import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import * as route53targets from 'aws-cdk-lib/aws-route53-targets'

import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront'

// import * as sqs from 'aws-cdk-lib/aws-sqs';






export class OzlemDevStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = 'ozlem.dev'

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        hostedZoneId: 'Z08242362SVQYZPB01HFU',
        zoneName: domainName,
      },
    )

    const certificate = new acm.DnsValidatedCertificate(this, 'WebCert', {
      domainName: domainName,
      region: 'us-east-1',
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(),
    })

    const ROOT_INDEX_FILE = 'index.html'

    const webSiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
    })



    const accessIdentity = new OriginAccessIdentity(this, 'OAI')

    webSiteBucket.grantRead(accessIdentity)

    const webSiteS3Origin = new origins.S3Origin(webSiteBucket, {
      originAccessIdentity: accessIdentity,
    })

    // Add a cloudfront Function to a Distribution
    const cfFunction = new cloudfront.Function(this, 'Function', {
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, "../functions/reqRewrite.js"),
      }),

    });


    // Create the CloudFront distribution
    const cloudfrontDistribution = new cloudfront.Distribution(
      this,
      'CloudFrontDistribution',
      {
        certificate: certificate,
        domainNames: [domainName],
        defaultRootObject: ROOT_INDEX_FILE,
        defaultBehavior: {
          origin: webSiteS3Origin,
          functionAssociations: [{
            function: cfFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    )

    new route53.ARecord(this, 'Arecord', {
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(cloudfrontDistribution),
      ),
      zone: zone,

    })

  }
}