const { insert } = require("@sap/cds");
const cds = require("@sap/cds");
const { getDestination } = require("@sap-cloud-sdk/connectivity");
const { Readable } = require('stream');
const fs = require("node:fs");


module.exports = cds.service.impl(async function () {
    const DOX = await cds.connect.to("DocInfoExtraction");
    const Token = await cds.connect.to("getToken");
    const db = await cds.connect.to("db");

    const { Jobs, Documents } = this.entities;

    const streamToBuffer = (stream) => {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    };
    
    this.on("READ", Jobs, async (req) => {
        //console.log(req);
        try {
            const response = await DOX.get("/document/jobs"); // API endpoint for fetching jobs
            if (!response || !response.results) return [];

            const jobsData = response.results.map(job => ({
                id: job.id,
                status: job.status,
                fileName: job.fileName,
                documentType: job.documentType,
                created: job.created,
                finished: job.finished,
                clientId: job.clientId
            }));

            // Store fetched jobs in the CAP database
            //  await INSERT.into(Jobs).entries(jobsData);

            // Return stored jobs
            //return SELECT.from(Jobs);
            //console.log(jobsData);
            return (jobsData);

        } catch (error) {
            req.error(500, `Failed to fetch jobs: ${error.message}`);
        }
    });

    this.on("jobTrigger", async (req) => {
        try {

            const ID = req.data.ID;

            // 1. Fetch the document from the database
            const doc = await SELECT.from(Documents).columns("id", "fileName", "extractId", "mediaType", "content").where({ id: ID }).limit(1);
            const document = doc[0];
            if (!document) {
                req.error(404, `Document with ID ${ID} not found`);
                return;
            }           

            if(document.extractId){
                return document.extractId;
            }
          
            const fileBuffer = await streamToBuffer(document.content);

            //  Convert content to Blob
            const fileBlob = new Blob([fileBuffer], { type: document.mediaType });

            //  Create FormData
            const formData = new FormData();
            formData.append("file", fileBlob, document.fileName);
            formData.append(
                "options",
                JSON.stringify({
                    clientId: "default",
                    documentType: "Resume",
                    receivedDate: "2025-03-25",
                    schemaId: "5a2537c8-93d4-4224-8109-c6baed1574fe",
                    templateId: "d38bb16f-1b4b-4d91-8c29-ff3941a5911d",
                    candidateTemplateIds: [],
                    enrichment: {}
                })
            );

            const sToken = await Token.get("/token?grant_type=client_credentials");
            if (!sToken || !sToken.access_token) {
                throw new Error("Failed to retrieve access token");
            }
            const myHeaders = new Headers();
            myHeaders.append("Authorization", "Bearer " + sToken.access_token);

            const response = await fetch("https://aiservices-trial-dox.cfapps.us10.hana.ondemand.com/document-information-extraction/v1/document/jobs", {
                method: "POST",
                headers: myHeaders,
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(`Failed to post document: ${result.message || response.statusText}`);
                      
            await UPDATE (Documents,ID) .with ({
                extractId: result.id
              });

            return result.id;
            
        } catch (error) {
            console.error("Error:", error);
            req.error(500, `Failed to post document: ${error}`);
        }
    });

    this.on("getDetails", async (req) => {

        try {
            const ID = req.data.ID;
            console.log(ID);
            const response = await DOX.get("/document/jobs/"+ ID ); // API endpoint for fetching jobs
            if (!response ) return [];
            
            return transformData(response);
            
        } catch (error) {
            console.error("Error:", error);
            req.error(500, `Failed to get data: ${error}`);
        }

    });

    function transformData(inputData) {
        return {
            header: {
                ID: inputData.id,
                FirstName: inputData.extraction.headerFields.find(field => field.name === "FirstName")?.value || "",
                LastName: inputData.extraction.headerFields.find(field => field.name === "LastName")?.value || "",
                degree: inputData.extraction.headerFields.find(field => field.name === "degree")?.value || "",
                email: inputData.extraction.headerFields.find(field => field.name === "email")?.value || "",
                phone: inputData.extraction.headerFields.find(field => field.name === "phone")?.value || ""
            },
            lineItems: inputData.extraction.lineItems.map(item => ({
                Name: item.find(field => field.name === "Name")?.value || "",
                Position: item.find(field => field.name === "Position")?.value || "",
                location: item.find(field => field.name === "location")?.value || "",
                Duration: item.find(field => field.name === "Duration")?.value || ""
            }))
        };
    }
});
