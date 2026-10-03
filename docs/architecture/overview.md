# Architecture overview

The platform is designed around an API-first contract where all teams depend on the same source of truth: the OpenAPI specification and the domain model.

## Core architecture

- Customer web app: mobile-first Next.js front end
- Mock API: realistic implementation for UI development and contract validation
- Backend: future Python + SQL implementation that follows the defined API
- Desktop app: staff-facing tools that conform to same domain and order lifecycle
- SQL database: logical relational model for shared domain data

## Contract-first flow

Requirement -> Domain model -> API contract -> OpenAPI -> Mock server -> Web app -> Backend -> Desktop

This minimizes the risk of incompatible assumptions across teams.
