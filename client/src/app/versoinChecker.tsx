import {
  Alert,
  AlertActionCloseButton,
  Button,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import React, { useEffect, useState } from "react";
import ENV from "./env";

interface VersionMetadata {
  version: string;
  commit_hash: string;
  buildTime: string;
}

const VersionChecker: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [oldVersion, setOldVersion] = useState<string | null>(
    localStorage.getItem("appVersion")
  );
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const VERSION = ENV.VERSION || "99.0.0"; // The version from the environment variable

  // Fetch the version from the build-version.json file
  const fetchVersionFromFile = async () => {
    try {
      const response = await fetch("/build-version.json");
      const data: VersionMetadata = await response.json();
      return data.version;
    } catch (error) {
      console.error("Error fetching version file:", error);
      return null;
    }
  };

  // Check if the version has changed
  const checkForVersionChange = async () => {
    const fileVersion = await fetchVersionFromFile();
    if (fileVersion && fileVersion !== VERSION && fileVersion !== oldVersion) {
      setNewVersion(fileVersion);
      setShowPopup(true);
      localStorage.setItem("appVersion", fileVersion); // Update the stored version
    }
    setLoading(false);
  };

  useEffect(() => {
    checkForVersionChange();
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <>
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <Flex
            justifyContent={{ default: "justifyContentCenter" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <Alert
                variant="info"
                title={`A new version (${newVersion}) of the UI is available!`}
                actionClose={
                  <AlertActionCloseButton onClose={handleClosePopup} />
                }
                isInline
              >
                <p>Old version: {oldVersion}</p>
                <Button variant="primary" onClick={handleReload}>
                  Reload App
                </Button>
              </Alert>
            </FlexItem>
          </Flex>
        </div>
      )}
    </>
  );
};

export default VersionChecker;
