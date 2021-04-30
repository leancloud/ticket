import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { Popover, OverlayTrigger } from 'react-bootstrap'
import _ from 'lodash'
import styles from './index.css'
const Radio = ({
  name,
  value,
  checked,
  disabled,
  required,
  onChange,
  label: labalContent,
  className,
  children,
  hint,
}) => {
  const id = useRef(_.uniqueId('radio'))
  const content = (
    <span
      className={classnames(styles.label, {
        [styles.disabled]: disabled,
        [styles.checked]: checked,
      })}
    >
      {labalContent || children || value}
    </span>
  )
  return (
    <label className={classnames(styles.container, className)}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        required={required}
        className={styles.radioInput}
        onChange={(e) => {
          if (onChange) {
            onChange(e.target.value)
          }
        }}
      />
      {hint ? (
        <OverlayTrigger
          trigger={['hover', 'focus']}
          placement="top"
          overlay={
            <Popover id={id}>
              <Popover.Content>{hint}</Popover.Content>
            </Popover>
          }
        >
          {content}
        </OverlayTrigger>
      ) : (
        content
      )}
    </label>
  )
}

Radio.propTypes = {
  name: PropTypes.string,
  value: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
  label: PropTypes.node,
  hint: PropTypes.node,
}

const RadioGroup = ({ name, value: activeValue, radios, required, onChange, className }) => {
  return (
    <div className={styles.groupContainer}>
      {radios.map(({ value, label: labelContent, disabled, hint }) => {
        return (
          <Radio
            name={name}
            key={value}
            value={value}
            required={required}
            disabled={disabled}
            checked={value === activeValue}
            label={labelContent}
            onChange={onChange}
            hint={hint}
            className={className}
          />
        )
      })}
    </div>
  )
}

RadioGroup.propTypes = {
  name: PropTypes.string,
  value: PropTypes.any,
  radios: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.node,
      disabled: PropTypes.bool,
      value: PropTypes.string.isRequired,
      hint: PropTypes.node,
    })
  ).isRequired,
  required: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
}

export { Radio, RadioGroup }
export default Radio
