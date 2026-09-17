Feature: Authentication on protected endpoints

  @auth
  Scenario: Initiate rejects a request with no token
    Given I have no auth token
    When I attempt to initiate an upload session
    Then the auth response status should be 401

  @auth
  Scenario: Initiate rejects a request with an invalid token
    Given I have an invalid auth token
    When I attempt to initiate an upload session
    Then the auth response status should be 401

  @auth
  Scenario: Status endpoint rejects a request with no token
    Given I have no auth token
    When I attempt to check the status of a fake upload
    Then the auth response status should be 401

  @auth
  Scenario: Blob endpoint rejects a request with no token
    Given I have no auth token
    When I attempt to retrieve a blob for a fake file id
    Then the auth response status should be 401

  @auth
  Scenario: Initiate rejects a request using the Basic authorisation scheme
    When I attempt to initiate an upload session with Basic credentials
    Then the auth response status should be 401

  @auth
  Scenario: Initiate rejects a request with an empty Bearer token
    When I attempt to initiate an upload session with the Authorization header "Bearer "
    Then the auth response status should be 401

  @auth
  Scenario: Metadata endpoint rejects a request with no token
    When I send a GET request to "/api/v1/metadata/sbi/123456789" without an auth token
    Then the response status should be 401

  @auth
  Scenario: Callback status endpoint rejects a request with no token
    When I send a GET request to "/api/v1/status/{randomUuid}" without an auth token
    Then the response status should be 401

  @auth @callback @internal-url
  Scenario: Callback endpoint accepts a request with no token
    Given a valid callback payload with a single complete file
    When the callback payload is posted to the object processor without an auth token
    Then the callback response status should be 201
    And the callback response should confirm metadata was created
