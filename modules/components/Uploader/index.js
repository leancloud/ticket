import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { db, http, storage } from '../../../lib/leancloud'
import styles from './index.module.scss'

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif']

function FileItem({ id, name, mime, url, isUploading, progress = 100, onRemove }) {
  const { t } = useTranslation()
  const isImage = useMemo(() => mime && IMAGE_MIMES.includes(mime), [mime])

  return (
    <Card
      className={styles.fileItem}
      style={{ backgroundImage: isImage && url ? `url(${url})` : undefined }}
    >
      {!isImage && (
        <>
          {isUploading ? <Icon.FileEarmarkArrowUp /> : <Icon.FileEarmark />}
          <div className={styles.name}>{name || t('loading')}</div>
        </>
      )}
      {isUploading ? (
        <ProgressBar animated className={styles.progress} now={progress} />
      ) : (
        <div className={styles.cover}>
          {url && <Icon.BoxArrowInUpRight onClick={() => window.open(url)} />}
          {id && <Icon.Trash className={styles.trashIcon} onClick={() => onRemove?.(id)} />}
        </div>
      )}
    </Card>
  )
}
FileItem.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  mime: PropTypes.string,
  url: PropTypes.string,
  isUploading: PropTypes.bool,
  progress: PropTypes.number,
  onRemove: PropTypes.func,
}

function UploadFileItem({ file, onChange, ...props }) {
  const $file = useRef(file)
  const [progress, setProgress] = useState(0)
  const [id, setId] = useState('')
  const [name, setName] = useState(file.name)
  const [mime, setMime] = useState('')
  const [url, setUrl] = useState('')
  const [isUploading, setIdUploading] = useState(false)
  const $onChange = useRef(onChange)
  $onChange.current = onChange

  useEffect(() => {
    const onProgress = ({ loaded, total }) => setProgress((loaded / total) * 100)
    setIdUploading(true)
    $onChange.current({ isUploading: true })
    storage
      .upload($file.current.name, $file.current, { onProgress })
      .then((file) => {
        setId(file.id)
        setName(file.name)
        setMime(file.mime)
        setUrl(file.url)
        setIdUploading(false)
        $onChange.current({ id: file.id, isUploading: false })
        return
      })
      .catch((error) => $onChange.current({ error, isUploading: false }))
  }, [])

  return (
    <FileItem
      {...props}
      id={id}
      name={name}
      mime={mime}
      url={url}
      isUploading={isUploading}
      progress={progress}
    />
  )
}
UploadFileItem.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  onChange: PropTypes.func.isRequired,
}

function FetchFileItem({ id, ...props }) {
  const $id = useRef(id)
  const [name, setName] = useState('')
  const [mime, setMime] = useState('')
  const [url, setURL] = useState('')

  useEffect(() => {
    db.class('_File')
      .object($id.current)
      .get()
      .then((obj) => {
        setName(obj.data.name)
        setMime(obj.data.mime_type)
        setURL(obj.data.url)
        return
      })
      .catch(console.error)
  }, [])

  return <FileItem {...props} id={$id.current} name={name} mime={mime} url={url} />
}
FetchFileItem.propTypes = {
  id: PropTypes.string.isRequired,
}

function UploadButton({ onChange }) {
  const $fileInput = useRef()
  const handleFileChange = (e) => {
    if (e.target.files.length) {
      onChange(Array.from(e.target.files))
      $fileInput.current.value = null
    }
  }

  return (
    <Card
      className={`${styles.fileItem} ${styles.upload}`}
      onClick={() => $fileInput.current.click()}
    >
      <input type="file" multiple ref={$fileInput} onChange={handleFileChange} />
      <Icon.Plus />
      <div className={styles.name}>Upload</div>
    </Card>
  )
}
UploadButton.propTypes = {
  onChange: PropTypes.func.isRequired,
}

export function Uploader({ fileIds, onRemove, onChange }) {
  const $nextKey = useRef(0)
  const [files, setFiles] = useState([])
  const [fileByKey, setFileByKey] = useState({})

  const handleAddNewFiles = (files) => {
    setFiles((current) => {
      return current.concat(files.map((file) => ({ file, key: $nextKey.current++ })))
    })
  }

  const handleRemoveNewFile = (key, id) => {
    setFiles((current) => current.filter((file) => file.key !== key))
    http.delete(`/api/1/files/${id}`).catch(console.error)
  }

  const handleChangeFileByKey = (key, info) => {
    const nextFileByKey = { ...fileByKey, [key]: info }
    setFileByKey(nextFileByKey)
    onChange?.(Object.values(nextFileByKey))
  }

  return (
    <Card className="flex-row flex-wrap p-1">
      {fileIds?.map((id) => (
        <FetchFileItem key={id} id={id} onRemove={onRemove} />
      ))}
      {files.map(({ key, file }) => (
        <UploadFileItem
          key={key}
          file={file}
          onRemove={(id) => handleRemoveNewFile(key, id)}
          onChange={(info) => handleChangeFileByKey(key, info)}
        />
      ))}
      <UploadButton onChange={handleAddNewFiles} />
    </Card>
  )
}
Uploader.propTypes = {
  fileIds: PropTypes.arrayOf(PropTypes.string),
  onRemove: PropTypes.func,
  onChange: PropTypes.func,
}
