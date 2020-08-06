import React, { PropTypes } from 'react';

export default (BaseComponent) => {
    const LocalizedComponent = (props, context) => (
        <BaseComponent
            translate={context.translate}
            locale={context.locale}
            {...props}
        />
    );

    LocalizedComponent.contextTypes = {
        translate: PropTypes.func.isRequired,
        locale: PropTypes.string.isRequired,
    };

    return LocalizedComponent;
};