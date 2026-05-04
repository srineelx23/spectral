# Angular Common Rules

## TypeScript Best Practices
- **Strict Typing**: Always use strict type checking.
- **Inference**: Prefer type inference when the type is obvious.
- **Avoid Any**: Never use the `any` type. Use `unknown` when the type is uncertain.

## Accessibility (A11y) Requirements
- **AXE Compliance**: All components MUST pass AXE accessibility checks.
- **WCAG AA**: Follow all WCAG AA minimums (focus management, color contrast, ARIA attributes).

## Project Organization & Standards
- **Lazy Loading**: Implement lazy loading for all feature routes.
- **Forms**: Prefer Reactive Forms over Template-driven forms.
- **Services**: Design services around a single responsibility.
- **Optimized Images**: Use `NgOptimizedImage` for all static images (Note: does not work for inline base64).
- **Paths**: Use paths relative to the component TS file when using external templates/styles.

## Project Structure
- **Root Directory**: All application code MUST reside inside `src/app/`.
- **Components**: Store all components in `src/app/components/` (e.g., `src/app/components/user-profile/`).
- **Services**: Store all services in `src/app/services/` (e.g., `src/app/services/auth.service.ts`).
- **Feature Modules**: For larger apps, group related components and services into feature folders within `src/app/features/`.
- **Interfaces/Models**: Store shared interfaces and models in `src/app/models/`.

## State Management Principles
- **Pure Transformations**: Keep state transformations pure and predictable.
- **Reactive Flow**: Ensure data flows reactively through the application.

## RxJS & Memory Management
- **Memory Leaks**: ALWAYS manage subscriptions to prevent memory leaks. Use the `async` pipe in templates whenever possible. If manual subscription is necessary, ensure you unsubscribe on component destruction.
- **Operators**: Use appropriate RxJS operators (e.g., `switchMap` for HTTP requests to cancel previous ones, `catchError` for error handling).

## Workflow & Execution Rules
- **Verification Requirement**: After implementing a feature, you MUST run `ng serve` (or `ng test` if TDD) to actively look for any compilation or runtime errors. Never assume your code works without checking the compiler output.
- **Strict Code Isolation**: When working with existing codebases, do NOT refactor or modify existing files outside of your specific task. You may change existing code **if and only if** it is strictly necessary to make the current feature execute or pass its tests.

## Error Handling & API
- **Interceptors**: Use HTTP Interceptors for global error handling, adding auth tokens, and logging.
- **Strong Typing for API**: Always define TypeScript interfaces/types for API responses. Do not use `any` for API data.

## Angular CLI Commands (Standard Tooling)
- **Project Creation**: `ng new <project-name>`
- **Development Server**: `ng serve`
- **Testing**: `ng test`
- **Scaffolding Components**: `ng generate component <name>` (or `ng g c <name>`)
- **Scaffolding Services**: `ng generate service <name>` (or `ng g s <name>`)
- **Scaffolding Directives**: `ng generate directive <name>`
- **Scaffolding Pipes**: `ng generate pipe <name>`
- **Scaffolding Guards**: `ng generate guard <name>`
- **Scaffolding Interceptors**: `ng generate interceptor <name>`
- **Scaffolding Interfaces**: `ng generate interface <name>`
- **Scaffolding Enums**: `ng generate enum <name>`
- **Scaffolding Classes**: `ng generate class <name>`
- **Scaffolding Environments**: `ng generate environments`
- **Scaffolding Resolvers**: `ng generate resolver <name>`
- **Production Build**: `ng build`
- **Linting**: `ng lint`
