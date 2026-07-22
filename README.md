# fcp-sfd-doc-upload-api-tests

Automated API test suite for the FCP SFD document upload journey.

Uses Cucumber + Node fetch to drive HTTP-level tests against the object processor and CDP Uploader. No browser dependency.

## Prerequisites

- Node.js >= 22.13.1
- A `.env` file with the following variables (see `.env.example`):
  - `OBJECT_PROCESSOR_URL` -- base URL for the object processor
  - `COGNITO_TOKEN_URL`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET` -- Cognito OAuth credentials
  - `TEST_USER_SBI`, `TEST_USER_CRN`, `TEST_USER_FRN` -- real user identity in Dynamics 365 test instance
  - `TEST_S3_BUCKET` -- environment-specific S3 bucket name

## Running the tests

Install dependencies:

    npm install

Run all tests:

    npm test

Run just the full journey:

    npm run test:tag "@full-journey"

## Test structure

- `features/upload-journey/` -- Gherkin feature files describing test scenarios
- `features/step-definitions/` -- JavaScript implementations of each step
- `features/support/` -- Cucumber world and hooks
- `fixtures/` -- test data, auth helpers, and fixture files

## Reporting

Allure reports are generated after each run:

    npm run report

Report opens as a single HTML file in `allure-report/`.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
