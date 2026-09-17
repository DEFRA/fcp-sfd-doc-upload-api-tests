Feature: Read endpoints and service health

  @smoke @internal-url
  Scenario: Health endpoint returns 200 without a token
    When I send a GET request to "/health" without an auth token
    Then the response status should be 200

  @metadata
  Scenario Outline: Metadata endpoint rejects a malformed SBI: <case>
    When I send a GET request to "/api/v1/metadata/sbi/<sbi>"
    Then the response status should be 400

    Examples:
      | case           | sbi        |
      | eight digits   | 12345678   |
      | ten digits     | 1234567890 |
      | non numeric    | abcdefghi  |

  @metadata
  Scenario: Metadata endpoint returns 404 for an SBI with no documents
    When I send a GET request to "/api/v1/metadata/sbi/999999999"
    Then the response status should be 404

  @status
  Scenario: Callback status endpoint rejects a malformed correlationId
    When I send a GET request to "/api/v1/status/not-a-uuid"
    Then the response status should be 400

  @status
  Scenario: Callback status endpoint returns an empty list for an unknown correlationId
    When I send a GET request to "/api/v1/status/{randomUuid}"
    Then the response status should be 200
    And the response data should be an empty array
