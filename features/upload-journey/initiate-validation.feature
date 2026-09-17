Feature: Initiate endpoint validation

  @initiate-validation
  Scenario: Initiate returns a well formed upload session
    Given an initiate payload with "metadata.reference" set to JSON "\"Response shape check\""
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 200
    And the initiate response should contain a valid upload session

  @initiate-validation
  Scenario Outline: Initiate rejects an invalid redirect: <case>
    Given an initiate payload with "redirect" set to JSON "<value>"
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 400
    And the initiate validation error should reference "redirect"

    Examples:
      | case              | value                       |
      | absolute URL      | \"https://example.com\"     |
      | protocol relative | \"//example.com\"           |
      | no leading slash  | \"document-upload\"         |

  @initiate-validation
  Scenario Outline: Initiate rejects a payload missing <field>
    Given an initiate payload without "<field>"
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 400
    And the initiate validation error should reference "<field>"

    Examples:
      | field                 |
      | redirect              |
      | metadata.submissionId |
      | metadata.reference    |
      | metadata.uosr         |
      | metadata.type         |
      | metadata.service      |

  @initiate-validation
  Scenario Outline: Initiate rejects an invalid <field>: <case>
    Given an initiate payload with "<field>" set to JSON "<value>"
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 400
    And the initiate validation error should reference "<field>"

    Examples:
      | case                    | field            | value                   |
      | unknown document type   | metadata.type    | \"Not_A_Document_Type\" |
      | unknown service         | metadata.service | \"some-other-service\"  |
      | SBI as a string         | metadata.sbi     | \"123456789\"           |
      | SBI as a decimal        | metadata.sbi     | 123456789.5             |
      | SBI just below minimum  | metadata.sbi     | 104999999               |
      | CRN just below minimum  | metadata.crn     | 1049999999              |
      | client supplied journey | metadata.journeyId | \"3f1c2b6e-8a4d-4f0e-9b7a-1c2d3e4f5a6b\" |

  @initiate-validation
  Scenario Outline: Initiate rejects an unknown field at <location>
    Given an initiate payload with "<field>" set to JSON "\"unexpected\""
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 400
    And the initiate validation error should reference "<field>"

    Examples:
      | location      | field                    |
      | top level     | unexpectedField          |
      | metadata      | metadata.unexpectedField |

  @initiate-validation
  Scenario Outline: Initiate accepts <field> at the lower boundary
    Given an initiate payload with "<field>" set to JSON "<value>"
    When I attempt to initiate an upload session with the invalid metadata
    Then the initiate response status should be 200

    Examples:
      | field        | value      |
      | metadata.sbi | 105000000  |
      | metadata.crn | 1050000000 |
      | metadata.frn | 1000000000 |
