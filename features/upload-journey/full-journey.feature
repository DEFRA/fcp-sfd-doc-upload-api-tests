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

 @file-types
  Scenario Outline: Upload journey works for supported file type <fileType>
    Given I initiate an upload session with valid metadata
    When I upload a "<filename>" of type "<contentType>" to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And the response should contain the correct file metadata for "<filename>"

    Examples:
      | fileType | filename              | contentType                                                             |
      | PDF      | test-document.pdf     | application/pdf                                                         |
      | PNG      | test-image.png        | image/png                                                               |
      | JPG      | test-image.jpg        | image/jpeg                                                              |
      | DOCX     | test-word.docx        | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
      | XLSX     | test-spreadsheet.xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet       |   