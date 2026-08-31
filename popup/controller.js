document.addEventListener("DOMContentLoaded", () => {
  const extensionToggle = document.getElementById("toggleSwitch");
  const statusDisplay = document.getElementById("status");
  const importFileInput = document.getElementById("importInput");

  function showExtensionStatus(enabled) {
    if (enabled) {
      statusDisplay.textContent = "启用中";
      statusDisplay.className = "enabled";
    } else {
      statusDisplay.textContent = "已禁用";
      statusDisplay.className = "disabled";
    }
  }

  function withActiveTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      callback(tabs[0]);
    });
  }

  document.getElementById("qrCode").src = chrome.runtime.getURL(
    "assets/support-qr.png",
  );

  chrome.storage.local.get(["extensionEnabled"], (storedSettings) => {
    const enabled = storedSettings.extensionEnabled !== false;
    extensionToggle.checked = enabled;
    showExtensionStatus(enabled);
  });

  extensionToggle.addEventListener("change", () => {
    const enabled = extensionToggle.checked;
    chrome.storage.local.set({ extensionEnabled: enabled }, () => {
      showExtensionStatus(enabled);
      withActiveTab((activeTab) => {
        if (activeTab) {
          chrome.tabs.sendMessage(activeTab.id, {
            action: "updateExtensionStatus",
            enabled,
          });
        }
      });
    });
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    withActiveTab((activeTab) => {
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "GM_export" },
        (response) => {
          if (response && response.success) {
            const exportBlob = new Blob([response.data], {
              type: "application/json",
            });
            const downloadUrl = URL.createObjectURL(exportBlob);
            const downloadLink = document.createElement("a");
            const timestamp = new Date()
              .toISOString()
              .slice(0, 19)
              .replace(/:/g, "-");

            downloadLink.href = downloadUrl;
            downloadLink.download = `wsmud_data_${timestamp}.json`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadUrl);
          } else {
            alert(`导出失败：${response?.error || "未知错误"}`);
          }
        },
      );
    });
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) {
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = (loadEvent) => {
      try {
        const importedText = loadEvent.target.result;
        withActiveTab((activeTab) => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: "GM_import", data: importedText },
            (response) => {
              if (response && response.success) {
                alert("数据导入成功！");
              } else {
                alert(`导入失败：${response?.error || "未知错误"}`);
              }
            },
          );
        });
      } catch (error) {
        alert(`JSON 格式错误：${error.message}`);
      }
    };
    fileReader.readAsText(selectedFile);
  });
});
