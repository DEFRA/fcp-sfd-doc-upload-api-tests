Feature: Full document upload journey

  @full-journey
  Scenario: Upload a real file end to end
    Given I initiate an upload session with valid metadata
    When I upload a real PDF file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the response should contain the correct file metadata
    And I should be able to retrieve a presigned download URL
    And the file should be downloadable from the presigned URL