import { useMemo } from 'react'
import { useQuery } from 'react-query'
import { http } from 'lib/leancloud'
import { useTranslation } from 'react-i18next'

const useTicketForm = (formId) => {
  const { i18n } = useTranslation()
  const { data: formData, isLoading, error } = useQuery({
    queryKey: ['ticketForm', formId],
    enabled: !!formId,
    select: (data) => {
      const { fieldIds, ...rest } = data
      return {
        ...rest,
        fieldIds: fieldIds.filter(
          (id) => id !== 'title' && id !== 'details' && id !== 'attachments'
        ),
      }
    },
    queryFn: () => http.get(`/api/1/ticket-forms/${formId}`),
  })
  const { data: fieldDataList, isLoading: fieldLoading, error: fieldError } = useQuery({
    queryKey: ['ticketForm/fields', i18n.language, formData ? formData.fieldIds : []],
    queryFn: () =>
      http.get(`/api/1/ticket-fields`, {
        params: {
          ids: formData.fieldIds.join(','),
          includeVariant: true,
          locale: i18n.language || 'default',
        },
      }),
    enabled: !!formData,
  })
  const data = useMemo(() => {
    if (!formData || !fieldDataList) {
      return
    }
    const { fieldIds, ...rest } = formData
    const fields = []
    fieldIds.forEach((id) => {
      const filterData = fieldDataList.filter((fieldData) => fieldData.id === id)
      if (filterData && filterData[0]) {
        fields.push(filterData[0])
      }
    })
    return {
      ...rest,
      fields,
    }
  }, [formData, fieldDataList])
  return {
    data,
    loading: isLoading || fieldLoading,
    error: error || fieldError,
  }
}

export default useTicketForm
