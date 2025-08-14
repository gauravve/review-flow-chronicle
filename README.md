# GitHub PR Review Timeline

A web application that visualizes GitHub pull request review progress and repository metrics. Get instant insights into your development workflow with beautiful charts and timelines.

## Features

- 📊 **Pull Request Metrics** - View PR statistics, review times, and approval rates
- 🔄 **Review Timeline** - Visualize the complete review process for individual PRs
- 📈 **Repository Trends** - Track repository activity and trends over time
- 🚀 **Build Metrics** - Monitor CI/CD pipeline performance and build times
- 🔍 **Smart Search** - Find specific PRs or browse recent repository activity

## GitHub Token Permissions

To access private repositories and get full functionality, you'll need a GitHub Personal Access Token with specific permissions.

### Creating a Fine-Grained Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Select the repositories you want to access
4. Configure the following permissions:

### Required Permissions

#### Core Features (Pull Requests & Repository Data)
- **Contents** (Read) - Access repository files and basic information
- **Metadata** (Read) - Access basic repository metadata
- **Pull requests** (Read) - View PRs, reviews, comments, and timelines

#### Build Metrics
- **Actions** (Read) - View workflow runs and build history

#### Enhanced Features (Optional but Recommended)
- **Issues** (Read) - Enhanced PR context and linked issues
- **Checks** (Read) - Detailed build status information
- **Commit statuses** (Read) - Legacy build status support

### Alternative: Classic Personal Access Token

If using a classic token, you need:
- **repo** scope (full repository access)

⚠️ **Note**: Classic tokens provide broader access than fine-grained tokens but are less secure.

### Token Usage

1. Generate your token with the required permissions
2. Copy the token (you won't be able to see it again)
3. In the application:
   - Enter your repository in the format `owner/repo`
   - Paste your token in the "GitHub Token" field
   - Check "Remember token" to save it in your browser for future use

## Features by Permission

| Feature | Required Permissions | Description |
|---------|---------------------|-------------|
| Public Repository Browsing | None | View PRs and metrics for public repos |
| Private Repository Access | Contents, Metadata, Pull requests | Access private repo data |
| Build Metrics | Actions | View CI/CD pipeline performance |
| Enhanced Build Status | Checks, Commit statuses | Detailed build information |
| Issue Context | Issues | See linked issues in PR timelines |

## Security Notes

- 🔐 Tokens are stored locally in your browser only
- 🚫 No tokens are sent to external servers
- 🎯 Fine-grained tokens limit access to specific repositories
- ⚡ You can revoke tokens anytime in GitHub settings

## Getting Started

1. **For Public Repositories**: No token needed - just enter `owner/repo`
2. **For Private Repositories**: 
   - Create a fine-grained token with the permissions above
   - Enter your repository and token
   - Start exploring your PR metrics!

## Troubleshooting

### "Authentication failed" errors
- Verify your token has the required permissions
- Check that the token has access to the specific repository
- Ensure the repository name is spelled correctly

### "Repository not found" errors
- Repository might be private (add a token)
- Check the repository name format: `owner/repo`
- Verify the repository exists and you have access

### Missing build metrics
- Ensure your token has "Actions" read permissions
- Repository must have GitHub Actions workflows
- Workflows must have run within the selected time period

## Development

This project is built with:
- React + TypeScript
- Vite for development
- Tailwind CSS for styling
- Recharts for data visualization
- GitHub REST API

### How to edit this code

There are several ways of editing your application:

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/35b59e0d-07aa-450e-a9bc-ee771661867e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

### Deployment

Simply open [Lovable](https://lovable.dev/projects/35b59e0d-07aa-450e-a9bc-ee771661867e) and click on Share → Publish.

### Custom Domain

You can connect a custom domain by navigating to Project > Settings > Domains and clicking Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## License

MIT License - feel free to use and modify as needed.
