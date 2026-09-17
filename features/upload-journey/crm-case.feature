Feature: CRM case creation for an upload submission

  # These scenarios guard FLS1-156, where a timeout on case creation caused a
  # redelivered message to create a second, duplicate CRM case, leaving a
  # user's later files attached to the wrong one.
  #
  # They assert the outcome, being one case per submission with every file
  # attached to it. They cannot force the timeout that triggers the defect,
  # since that needs a service config change, SQS access and Mongo access that
  # this suite deliberately does not have. Reproducing the trigger stays a
  # manual step, documented on FLS1-156.
  #
  # They require read-only Dataverse credentials. Without them the scenarios
  # skip rather than fail.

  @crm @crm-case
  Scenario: A single file submission creates exactly one CRM case
    Given read-only CRM access is configured
    And I initiate an upload session with a unique CRM test reference
    When I upload a real PDF file to the CDP Uploader
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And exactly one CRM case should exist for the test reference
    And the CRM case should have exactly one online submission

  @crm @crm-case
  Scenario: Every file in a submission attaches to the same CRM case
    Given read-only CRM access is configured
    And I initiate an upload session with a unique CRM test reference
    When I upload two files under separate field names
    And I poll the status endpoint until the upload completes
    Then the upload status should be "success"
    And exactly one CRM case should exist for the test reference
    And every uploaded file should have metadata attached to that case
