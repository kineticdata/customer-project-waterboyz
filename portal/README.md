# Customer Project Waterboyz

This repo contains all configurations and front-end portal code for the Waterboyz project. 

Waterboyz is a non-profit organization that feeds and supports families in need of help. The portal enables people to nominate families for help (projects around their home as well as for sponsorship for christams gifts and food during the holidays).

The esential function of the project is to map volunteers with families in need and coordinate projects and events.

## Table of Contents

- [Quick Start](#quick-start)
- [Included Libraries](#included-libraries)
- [Project Structure](#project-structure)
- [Documentation](#documentation)

## Quick Start

### Clone the Repository

```
git clone https://github.com/kineticdata/customer-project-waterboyz
```

The front end code can be found in the `portal` directory of the repo.

### Install Dependencies

```bash
# make sure you are in the `portal` directory
$ yarn install
```

Requires `node` `v18` or later, and `yarn` `v1`.

### Start Local Dev Server

```bash
# starts the dev server with hot reload at http://localhost:3000
$ yarn start
```

The first time you run the above command, you will be prompted to enter a URL to a Kinetic Platform server, which the dev server will proxy to. This URL will be stores in the `.env.development.local` file and can later be changed there.

The local server will be available at [http://localhost:3000](http://localhost:3000). Changes to source files will update automatically.

### Create Production Build

```bash
# build for production with minification
$ yarn build
```

The build artifacts will be stored in the `build/` directory.

## Included Libraries

The following list summarizes the different libraries that have been used to create this project.

[Vite](https://vite.dev/): Build tooling for the project.  
[React](https://react.dev/): Framework for building out the application.  
[React Router](https://reactrouter.com/en/main): Routing library.  
[Redux Toolkit](https://redux-toolkit.js.org/) + [ReactRedux](https://react-redux.js.org/): Global state storage.  
[Ark UI](https://ark-ui.com/): Headless component library.  
[Tailwind CSS](https://tailwindcss.com/): Utility-first CSS framework.  
[Tabler Icons](https://tabler.io/icons): Icon library.  
[@kineticdata/react](https://components.kineticdata.com/apis): Kinetic API helpers, authentication, form rendering, and i18n.  
[date-fns](https://date-fns.org/): Date utility library.  
[immer](https://immerjs.github.io/immer/): Immutable data helper.  
[clsx](https://github.com/lukeed/clsx): Class name helper.

## Project Structure

```
momentum-portal/portal
├── src/                    # project source code
│   ├── assets/             # static assets (e.g. styles, fonts)
│   ├── atoms/              # design system components
│   ├── components/         # components used by pages
│   ├── helpers/            # helper functions
│   ├── pages/              # pages within the app
│   │
│   ├── App.js              # app renderer
│   ├── index.js            # javascript root
│   ├── redux.js            # redux toolkit setup
│   └── setupEnv.cjs        # prestart script to set up local env file
│
├── .env.development        # dev environment variables
├── .env.development.local  # local dev environment variables
├── .env.production         # prod environment variables
├── index.html              # html root
├── package.json
├── postcss.config.js       # postcss config used by tailwind
├── tailwind.config.js      # tailwind config
├── vite.config.mjs         # vite config
└── yarn.lock               # dependency lock file - DO NOT EDIT OR DELETE
```

## Documentation

[Kinetic Widgets Documentation &#x2B9E;](src/components/kinetic-form/widgets/README.md)

See the [Kinetic Data Documentation Library](https://docs.kineticdata.com/) for more information.

## Portal S3 Deployment

The Momentum Portal code can be found in an S3 bucket. The base URL for the S3 bucket is: `https://s3.amazonaws.com/kinetic-portals/portals/momentum-portal/versions/`

There are versioned directories in S3 that correspond to specific Github Workflow actions that trigger based on events that take place in the repository. The workflow files can be found [here](../.github/workflows/).

| Github Event          | Version Directory | Github Action Workflow File | Example Usage                                  |
| --------------------- | ----------------- | --------------------------- | ---------------------------------------------- |
| Tag Push              | vXX.YY.ZZ         | portal-tag-push.yaml        | Releasing a tagged version.                    |
| Commit to Main Branch | latest            | portal-main-commits.yaml    | Testing latest commits to main.                |
| Run Dispatch Workflow | YYYYMMDD-abcd1234 | portal-build-dispatch.yaml  | Testing code on a particular branch or commit. |

Example: merging a PR (which causes a commit in the `main` branch) would result in the portal path of `https://s3.amazonaws.com/kinetic-portals/portals/momentum-portal/versions/latest/`

You can also view the output to determine the S3 bucket by viewing the Github Action workflow run.

[github_actions_directory](../.github/workflows/)

### License

Code released under [the MIT license](https://github.com/coreui/coreui-free-react-admin-template/blob/main/LICENSE).
