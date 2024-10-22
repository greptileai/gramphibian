
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