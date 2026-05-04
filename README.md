# Sales Website on AWS

Base architecture for a sales website on AWS with:

- static frontend on `S3 + CloudFront`
- optional backend on `API Gateway + Lambda`
- optional lead capture storage in `DynamoDB`
- infrastructure managed with `CloudFormation`

## Why this approach

This is a strong v1 for a sales site because it is:

- cheap to run
- easy to scale
- simple to operate
- ready to grow into a fuller product later

## Proposed architecture

See [docs/architecture.md](/Users/nicolas/Documents/New%20project/docs/architecture.md).

## Infrastructure

CloudFormation template:

- [infra/cloudformation/sales-website.yaml](/Users/nicolas/Documents/New%20project/infra/cloudformation/sales-website.yaml)

## Deploy

Create the stack:

```bash
aws cloudformation deploy \
  --stack-name sales-website-dev \
  --template-file infra/cloudformation/sales-website.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ProjectName=sales-website \
    Environment=dev \
    EnableBackend=true
```

Then inspect outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name sales-website-dev \
  --query 'Stacks[0].Outputs'
```

Upload the static site to S3 after deployment:

```bash
aws s3 sync ./dist s3://YOUR_BUCKET_NAME --delete
```

Create a CloudFront invalidation after each frontend deploy:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths '/*'
```

## Recommended next steps

1. Create the frontend in `Next.js`, `Astro`, or `React + Vite`.
2. Add a lead capture form that posts to `/api/leads`.
3. Add a custom domain with ACM in `us-east-1`.
4. Add CI/CD for frontend deploys and CloudFormation updates.
