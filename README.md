This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# AI Changelog Generator

An intelligent changelog generator that uses AI to create meaningful changelogs from Git commits. Supports multiple AI providers (OpenAI GPT-4 and Greptile) for generating human-readable changelogs.

## Features

- Fetch git diffs from GitHub repositories
- Generate changelogs using either OpenAI GPT-4 or Greptile
- Smart diff truncation to handle large repositories
- Detailed logging system
- Development mode with mock changelogs
- Clean, minimal UI built with Next.js and Tailwind CSS

## Prerequisites

- Node.js 18.17 or later
- npm
- GitHub Personal Access Token
- OpenAI API Key (if using OpenAI)
- Greptile API Key (if using Greptile)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/changelog-generator.git
cd changelog-generator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
GITHUB_PAT=your_github_personal_access_token
OPENAI_API_KEY=your_openai_api_key
GREPTILE_API_KEY=your_greptile_api_key

# Enable ONE of these (or neither for mock changelog)
ENABLE_GREPTILE=false
ENABLE_OPENAI=false
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Enter:
   - GitHub repository URL
   - Date range for the changelog
   - Click "Generate Changelog"

## Configuration

### LLM Provider Selection
- Set `ENABLE_OPENAI=true` to use OpenAI's GPT-4
- Set `ENABLE_GREPTILE=true` to use Greptile
- Leave both disabled to get mock changelogs (useful for development)

### Environment Variables
- `GITHUB_PAT`: GitHub Personal Access Token with repo access
- `OPENAI_API_KEY`: OpenAI API key (required if using OpenAI)
- `GREPTILE_API_KEY`: Greptile API key (required if using Greptile)

## Development

The project uses:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components

Logs are written to:
- `logs/changelog-debug.log`: All logs
- `logs/changelog-error.log`: Error logs only

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request