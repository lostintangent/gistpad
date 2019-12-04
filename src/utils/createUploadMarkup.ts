
export const createUploadMarkup = (id: string | number, isUploading: boolean) => {
    const textAction = isUploading
        ? 'Uploading'
        : 'Creating';

    const markup = `***${textAction} image ${id}..***`;

    return markup;
}