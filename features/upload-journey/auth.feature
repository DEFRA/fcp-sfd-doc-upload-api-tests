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