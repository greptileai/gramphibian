# CLAUDE.md - Gramphibian Project Guidelines

## Build & Development Commands
- `npm run dev` - Start development server with Turbo mode
- `npm run build` - Build the Next.js application
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, use explicit types for function parameters and returns
- **Naming**: React components use PascalCase, functions/variables use camelCase, interfaces use PascalCase
- **Imports**: Group imports - React first, third-party libraries next, project imports last (with @/ path alias)
- **Error Handling**: Always use try/catch blocks, structured error logging with context metadata
- **Components**: Prefer functional components with hooks, use typed props
- **Logging**: Use the Winston logger from `/src/lib/logger.ts` with appropriate log levels
- **UI Components**: Utilize the shadcn/ui components in `/src/components/ui`
- **Styling**: Use Tailwind CSS utility classes