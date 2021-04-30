import React, { useMemo, memo, useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toInteger } from 'lodash'
import { Button, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import { Trans } from 'react-i18next'
import { useURLSearchParam, useApplyChanges } from 'modules/utils/hooks'
import { formatNumber } from 'modules/utils'
import _ from 'lodash'
import styles from './index.module.scss'

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZES = [10, 20, 40, 60, 100]

export const usePagination = (defaultPageSize = DEFAULT_PAGE_SIZE) => {
  const [urlPage, , changePage] = useURLSearchParam('page')
  const [urlPageSize, , changePageSize] = useURLSearchParam('size')
  const applyChanges = useApplyChanges()
  const { page, pageSize, limit, skip } = useMemo(() => {
    const pageTmp = urlPage ? Math.max(toInteger(urlPage), 1) : 1
    const pageSizeTmp = urlPageSize ? toInteger(urlPageSize) : defaultPageSize
    return {
      page: pageTmp,
      pageSize: pageSizeTmp,
      limit: pageSizeTmp,
      skip: (pageTmp - 1) * pageSizeTmp,
    }
  }, [urlPage, urlPageSize, defaultPageSize])

  return {
    page,
    pageSize,
    limit,
    skip,
    changePageSize,
    changePage,
    applyChanges,
  }
}
// 规避 trans warning
const PageSizeSelect = ({ value, onChange }) => {
  return (
    <Form.Control
      as="select"
      size="sm"
      className={styles.select}
      value={value.toString()}
      onChange={(e) => {
        if (onChange) {
          onChange(_.toNumber(e.currentTarget.value))
        }
      }}
    >
      {PAGE_SIZES.map((size) => (
        <option key={size} value={size}>
          {size}
        </option>
      ))}
    </Form.Control>
  )
}
PageSizeSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
}

export const Pagination = ({ count = 0, defaultPageSize }) => {
  const { t } = useTranslation()
  const { page, pageSize, changePageSize, changePage, applyChanges } = usePagination(
    defaultPageSize
  )
  const total = useMemo(() => Math.ceil(count / pageSize), [count, pageSize])
  const [inputPage, setInputPage] = useState(page)
  useEffect(() => setInputPage(page), [page])
  const onPageSizeChange = useCallback(
    (size) => {
      if (size === pageSize) {
        return
      }
      applyChanges([changePageSize(size), changePage()])
    },
    [applyChanges, changePageSize, changePage, pageSize]
  )
  const onPageChange = useCallback(
    (value) => {
      value = _.clamp(value, 1, total)
      if (value !== page) {
        applyChanges([changePage(value)])
      }
    },
    [applyChanges, changePage, total, page]
  )
  const inputPageJump = () => {
    // 为 '' 时 回滚值
    if (inputPage === '') {
      setInputPage(page)
      return
    }
    let numValue = _.toNumber(inputPage)
    if (isNaN(numValue)) {
      setInputPage(page)
      return
    }
    numValue = _.clamp(numValue, 1, total)
    setInputPage(numValue)
    onPageChange(numValue)
  }

  return (
    <div className="my-2 d-flex justify-content-between flex-wrap">
      <span className={`${styles.info} mr-auto`}>
        <Trans i18nKey="pagination.display" values={{ total: formatNumber(count) }}>
          Total <b /> items ·
          <PageSizeSelect
            value={pageSize.toString()}
            onChange={(value) => onPageSizeChange(value)}
          />
          items per page
        </Trans>
      </span>
      <span className={styles.page}>
        <Form.Control
          type="number"
          size="sm"
          className={styles.pageInput}
          value={inputPage}
          onChange={(e) => setInputPage(e.currentTarget.value)}
          onBlur={inputPageJump}
          onKeyDown={(e) => {
            // enter
            if (e.keyCode === 13) {
              inputPageJump()
            }
          }}
        />
        <span>{t('pagination.totalPage', { total: formatNumber(total) })}</span>
      </span>
      <span>
        <Button
          className={`${styles.pageButton} mr-1`}
          variant="outline-primary"
          disabled={page <= 1}
          size="sm"
          onClick={() => onPageChange(page - 1)}
        >
          &larr; {t('previousPage')}
        </Button>
        <Button
          className={styles.pageButton}
          variant="outline-primary"
          disabled={page >= total}
          size="sm"
          onClick={() => onPageChange(page + 1)}
        >
          {t('nextPage')} &rarr;
        </Button>
      </span>
    </div>
  )
}

Pagination.propTypes = {
  count: PropTypes.number,
  defaultPageSize: PropTypes.number,
}

export default memo(Pagination)
