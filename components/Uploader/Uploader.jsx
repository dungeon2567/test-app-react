'use client'

import { Title, Text, Anchor } from '@mantine/core';
import classes from './Uploader.module.css';

// Import FilePond styles
import 'filepond/dist/filepond.min.css'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'

// Import React FilePond
import { registerPlugin, FilePond } from 'react-filepond'

import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import FilePondPluginImageEdit from 'filepond-plugin-image-edit';
import { useEffect, useRef, useState } from 'react';

import Dexie from 'dexie';

const db = new Dexie('upload-queue');

db.version(1).stores({
  files: 'id', // Primary key and indexed props
});

// Register the plugins
registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginImageEdit)

const saveFileToUploadQueue = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    const id = file.id ?? uuid();

    reader.onload = function () {
      db.files.add({
        id: id,
        name: file.name,
        data: reader.result,
        type: file.type,
        size: file.size
      });
    };

    resolve(id);

    reader.readAsArrayBuffer(file);
  });
};

function uuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Convert byte array to hexadecimal string
  let hexString = "";
  for (let i = 0; i < bytes.length; i++) {
    hexString += bytes[i].toString(16).padStart(2, '0');
  }

  // Replace specific bytes to form a valid UUID
  hexString = hexString.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16 | 0;
    let v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  return hexString;
}

export function Welcome() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    db.table('files').toArray().then(function (items) {
      const results = items.map(result => {
        const blob = new Blob([result.data], { type: result.type });

        const file = new File([blob], result.name, { type: blob.type });

        file.id = result.id;

        return {
          // the server file reference
          source: result.id,

          // set type to local to indicate an already uploaded file
          options: {
            type: 'local',

            // mock file information
            file
          }
        };
      });

      setFiles([...files, ...results]);
    });

    window.addEventListener("online", (event) => {
      db.table('files').toArray().then(function (items) {

      });
    });

  }, []);

  return (
    <>
      <div className="App">
        <FilePond
          files={files}
          onupdatefiles={(fileItems) => {
            setFiles(fileItems.map((fileItem) => fileItem.file));
          }}
          onremovefile={(error, { file }) => {
            if (file.id) {
              db.table("files").delete(file.id);
            }
          }}
          maxParallelUploads={30}
          allowMultiple={true}
          maxFiles={90}
          server={
            {
              load: (source, load, error, progress, abort, headers) => {
                // Should expose an abort method so the request can be cancelled
                return {
                  abort: () => {
                    // User tapped cancel, abort our ongoing actions here

                    // Let FilePond know the request has been cancelled
                    abort();
                  },
                };
              },

              revert: (uniqueFieldId, load, error) => {
                db.table("files")
                  .delete(uniqueFieldId)
                  .then(load)
                  .catch(error);
              },

              process: (fieldName, file, metadata, load, error, progress, abort, transfer, options) => {
                /*
                if (navigator.onLine) {

                  // fieldName is the name of the input field
                  // file is the actual file object to send
                  const formData = new FormData();
                  formData.append(fieldName, file, file.name);

                  const request = new XMLHttpRequest();
                  request.open('POST', 'url-to-api');

                  // Should call the progress method to update the progress to 100% before calling load
                  // Setting computable to false switches the loading indicator to infinite mode
                  request.upload.onprogress = (e) => {
                    progress(e.lengthComputable, e.loaded, e.total);
                  };

                  // Should call the load method when done and pass the returned server file id
                  // this server file id is then used later on when reverting or restoring a file
                  // so your server knows which file to return without exposing that info to the client
                  request.onload = function () {
                    if (request.status >= 200 && request.status < 300) {
                      // the load method accepts either a string (id) or an object
                      load(request.responseText);
                    } else {
                      // Can call the error method if something is wrong, should exit after
                      error('oh no');
                    }
                  };

                  request.send(formData);

                  // Should expose an abort method so the request can be cancelled
                  return {
                    abort: () => {
                      // This function is entered if the user has tapped the cancel button
                      request.abort();

                      // Let FilePond know the request has been cancelled
                      abort();
                    },
                  };
                }
                else {
                  saveFileToUploadQueue(file).then(id => {
                    load(id);
                  });
                }
                */

                saveFileToUploadQueue(file).then(id => {
                  load(id);
                });
              },
            }
          }
          name="files" /* sets the file input name, it's filepond by default */
          labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
        />
      </div>
    </>
  );
}
