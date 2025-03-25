sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/m/MessageToast',
	"sap/m/PDFViewer",
	"sap/ui/model/json/JSONModel"
], (Controller, MessageToast, PDFViewer, JSONModel) => {
	"use strict";

	return Controller.extend("demo.doc.upload.docupload.controller.upload", {
		onInit() {
			this.documentID = '';
		},


		fetchExtractedData: function (ID) {

			var sServiceUrl = `/odata/v4/document-extraction/getDetails(ID='${ID}')`;

			var oModel = new JSONModel();
			var that = this;

			// Fetch data from endpoint
			$.ajax({
				url: sServiceUrl,
				method: "GET",
				contentType: "application/json",
				success: function (oData) {
					oModel.setData(oData);
					that.getView().setModel(oModel, "extractedData");
					MessageToast.show("Data Loaded Successfully");
				},
				error: function (oError) {
					console.error("Failed to fetch extracted data", oError);
					MessageToast.show("Failed to load data");
				}
			});
		},

		handleShowData: function () {
			this.fetchExtractedData(this.documentID);
		},

		handleExtractData: function () {

			var oTable = this.byId("documentsTable");
			var oSelectedItem = oTable.getSelectedItem();

			if (!oSelectedItem) {
				sap.m.MessageToast.show("Please select a document first.");
				return;
			}

			var oContext = oSelectedItem.getBindingContext();
			var docId = oContext.getProperty("id");

			var sServiceUrl = `/odata/v4/document-extraction/jobTrigger(ID='${docId}')`;

			var oModel = new JSONModel();
			var that = this;

			// Fetch data from endpoint
			$.ajax({
				url: sServiceUrl,
				method: "GET",
				contentType: "application/json",
				success: function (oData) {
					that.documentID = oData.value;
					MessageToast.show("Data Triggered Successfully");
				},
				error: function (oError) {
					console.error("Failed to fetch trigger data", oError);
					MessageToast.show("Failed to load data");
				}
			});
		},

		onFileChange: function (oEvent) {
			var oFileUploader = oEvent.getSource();
			var oFile = oFileUploader.oFileUpload.files[0]; // Get selected file

			if (oFile) {
				this._selectedFile = oFile; // Store file for later upload
			}
		},
		handleUploadComplete: function (oEvent) {
			// Please note that the event response should be taken from the event parameters but for our test example, it is hardcoded.

			var sResponse = "File upload complete. Status: 200",
				iHttpStatusCode = parseInt(/\d{3}/.exec(sResponse)[0]),
				sMessage;

			if (sResponse) {
				sMessage = iHttpStatusCode === 200 ? sResponse + " (Upload Success)" : sResponse + " (Upload Error)";
				MessageToast.show(sMessage);
			}
		},

		handleUploadPress: function () {
			var oFileUploader = this.byId("fileUploader");
			if (!this._selectedFile) {
				MessageToast.show("Please select a file first.");
				return;
			}

			var oFile = this._selectedFile;
			var formData = new FormData();
			formData.append("file", oFile);
			var that = this;
			// Create an XMLHttpRequest to send the file
			var xhr = new XMLHttpRequest();
			xhr.open("POST", "/odata/v2/document-extraction/Documents", true);
			xhr.setRequestHeader("slug", encodeURIComponent(oFile.name)); // Set file name
			xhr.setRequestHeader("Content-Type", oFile.type); // Set file type

			xhr.onload = function () {
				if (xhr.status === 201 || xhr.status === 200) {
					that.getView().getModel().refresh(true);
					oFileUploader.clear();
					MessageToast.show("File uploaded successfully!");

				} else {
					MessageToast.show("File upload failed. Status: " + xhr.status);
				}
			};

			xhr.onerror = function () {
				MessageToast.show("Network error occurred.");
			};

			xhr.send(formData); // Send file
		},
		handleViewPDF: function (oEvent) {
			this._pdfViewer = new PDFViewer({
				isTrustedSource: false,
				displayType: "Embedded"
			});
			this.getView().addDependent(this._pdfViewer);
			var oTable = this.byId("documentsTable");
			var oSelectedItem = oTable.getSelectedItem();

			if (!oSelectedItem) {
				sap.m.MessageToast.show("Please select a document first.");
				return;
			}

			var oContext = oSelectedItem.getBindingContext();
			var docId = oContext.getProperty("id");

			const model = this.getView().getModel();
			const sServiceURL = model.sServiceUrl;

			// Construct the API URL
			const sSource = sServiceURL + "/Documents(guid'" + docId + "')/$value";
			this._pdfViewer.setSource(sSource);
			this._pdfViewer.setTitle("PDF");
			this._pdfViewer.open();
		},

		handleDelete: function (oEvent) {
			var oTable = this.byId("documentsTable");
			var oSelectedItem = oTable.getSelectedItem();

			if (!oSelectedItem) {
				sap.m.MessageToast.show("Please select a document first.");
				return;
			}

			var oContext = oSelectedItem.getBindingContext();
			var docId = oContext.getProperty("id");

			// Send DELETE request to CAP
			this.getView().getModel().remove("/Documents(guid'" + docId + "')")
				.then(response => {
					if (response.ok) {
						MessageToast.show("Document deleted successfully!");
						that.loadDocuments(); // Refresh table
					} else {
						MessageToast.show("Error deleting document.");
					}
				})
				.catch(() => MessageToast.show("Deletion failed!"));
		}
	});
});