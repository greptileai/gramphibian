
# Gramphibian
Hi, welcome to Gramphibian - A tool that automatically generates changelogs for you! 

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
git clone https://github.com/AbhinavHampiholi/changelog-generator.git
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

# Enable these
ENABLE_GREPTILE=true
ENABLE_OPENAI=true
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
- I used Claude Sonnet to generate most of the boilerplate
