import React, { useCallback, useMemo, useRef } from 'react'
import { Card, ProgressBar } from 'react-bootstrap'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import styles from './index.module.scss'
import { useTranslation } from 'react-i18next'

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif']

function ErrorFileItem({ name, onRemove }) {
  return (
    <Card className={`${styles.fileItem} ${styles.error}`}>
      <Icon.ExclamationCircle />
      <div className={styles.name}>{name}</div>
      <div className={styles.cover}>
        <Icon.Trash onClick={onRemove} />
      </div>
    </Card>
  )
}
ErrorFileItem.propTypes = {
  name: PropTypes.string.isRequired,
  onRemove: PropTypes.func,
}

function FileItem({ name, mime, url, progress, error, onRemove }) {
  const isImage = useMemo(() => {
    return mime && IMAGE_MIMES.includes(mime)
  }, [mime])
  const backgroundImage = useMemo(() => {
    return isImage && url ? `url(${url})` : undefined
  }, [isImage, url])
  const handleOpenUrl = useCallback(() => url && window.open(url), [url])

  const isUploading = progress !== undefined

  if (error) {
    return <ErrorFileItem name={name} error={error} onRemove={onRemove} />
  }
  return (
    <Card className={styles.fileItem} style={{ backgroundImage }}>
      {(!isImage || isUploading) && (
        <>
          {isUploading ? <Icon.FileEarmarkArrowUp /> : <Icon.FileEarmark />}
          <div className={styles.name}>{name}</div>
        </>
      )}
      {isUploading ? (
        <ProgressBar animated className={styles.progress} now={progress} />
      ) : (
        <div className={styles.cover}>
          <Icon.BoxArrowInUpRight onClick={handleOpenUrl} />
          <Icon.Trash onClick={onRemove} />
        </div>
      )}
    </Card>
  )
}
FileItem.propTypes = {
  name: PropTypes.string.isRequired,
  mime: PropTypes.string,
  url: PropTypes.string,
  progress: PropTypes.number,
  error: PropTypes.any,
  onRemove: PropTypes.func,
}

function UploadButton({ onUpload }) {
  const { t } = useTranslation()
  const $fileInput = useRef()
  const handleChangeFile = useCallback(
    (e) => {
      const files = e.target.files
      if (files.length) {
        onUpload(Array.from(files))
        $fileInput.current.value = null
      }
    },
    [onUpload]
  )
  const handleClick = useCallback(() => $fileInput.current.click(), [])

  return (
    <Card className={`${styles.fileItem} ${styles.upload}`} onClick={handleClick}>
      <input type="file" multiple ref={$fileInput} onChange={handleChangeFile} />
      <Icon.Plus />
      <div className={styles.name}>{t('upload')}</div>
    </Card>
  )
}
UploadButton.propTypes = {
  onUpload: PropTypes.func.isRequired,
}

export function Uploader({ files, onUpload, onRemove }) {
  return (
    <Card className="flex-row flex-wrap p-1">
      {files?.map((file) => (
        <FileItem {...file} key={file.key} onRemove={() => onRemove(file)} />
      ))}
      <UploadButton onUpload={onUpload} />
    </Card>
  )
}
Uploader.propTypes = {
  files: PropTypes.array,
  onUpload: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
}
