# Project Bootstrap

This repository is the working project for a sales website.

## Objective

Build a production-minded sales website with:

- static frontend
- AWS-first infrastructure
- CloudFormation as the primary infrastructure approach
- `S3 + CloudFront` for website delivery
- optional backend with `API Gateway + Lambda`
- simple business workflows such as lead capture

## Current Architecture Direction

- CloudFront as the public entry point
- private S3 bucket as static origin
- optional HTTP API for `/api/*`
- Lambda for backend logic
- DynamoDB for leads or lightweight app data

## Working Rules

- prefer simple and explicit AWS architecture
- prefer CloudFormation over CDK unless there is a strong reason to switch
- keep the frontend fast, conversion-oriented, and easy to deploy
- avoid unnecessary complexity in the first version
- when proposing infra changes, explain cost, security, and operational impact

## Team Roles

- `ceo`: strategy, priorities, delegation, business decisions
- `developer`: frontend, backend, product implementation
- `devops`: AWS architecture, CloudFormation, deployment, security, observability

## Expected Near-Term Deliverables

1. architecture definition
2. infrastructure base
3. frontend structure for the sales site
4. lead capture flow
5. deployment workflow
